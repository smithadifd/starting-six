'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { TYPE_COLORS } from '../../../tailwind.config';

interface Move {
  id: number;
  name: string;
  slug: string;
  type: string;
  damageClass: string;
  power: number | null;
  accuracy: number | null;
  pp: number;
}

interface MoveSelectorProps {
  pokemonId: number;
  slot: number; // 1-4
  currentMove: Move | null;
  onSelect: (slot: number, moveId: number | null) => void;
}

export function MoveSelector({ pokemonId, slot, currentMove, onSelect }: MoveSelectorProps) {
  const [open, setOpen] = useState(false);
  const [moves, setMoves] = useState<Move[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchMoves = useCallback(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    fetch(`/api/pokemon/${pokemonId}/moves`)
      .then((res) => res.json())
      .then((json) => setMoves(json.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pokemonId]);

  const handleOpen = useCallback(() => {
    setOpen((prev) => {
      if (!prev) fetchMoves();
      return !prev;
    });
  }, [fetchMoves]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const filtered = search
    ? moves.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    : moves;

  const handleSelect = useCallback((moveId: number | null) => {
    onSelect(slot, moveId);
    setOpen(false);
    setSearch('');
  }, [slot, onSelect]);

  const damageClassColors: Record<string, string> = {
    physical: 'text-orange-400',
    special: 'text-blue-400',
    status: 'text-gray-400',
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleOpen}
        className="w-full flex items-center justify-between gap-1 rounded-xl border border-white/[0.08] bg-surface-bright px-2 py-1.5 text-xs hover:bg-white/[0.05] transition-colors"
      >
        {currentMove ? (
          <span className="flex items-center gap-1.5 truncate">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: TYPE_COLORS[currentMove.type] ?? '#888' }}
            />
            <span className="truncate">{currentMove.name}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Move {slot}</span>
        )}
        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute z-40 top-full left-0 mt-1 rounded-xl ghost-border bg-card shadow-2xl max-h-72 flex flex-col w-72 sm:w-80">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.05]">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search moves..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {currentMove && (
              <button
                onClick={() => handleSelect(null)}
                className="text-xs text-muted-foreground hover:text-red-400"
                title="Clear move"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-1">
            {loading ? (
              <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No moves found</p>
            ) : (
              filtered.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSelect(m.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs hover:bg-white/[0.05] transition-colors ${
                    currentMove?.id === m.id ? 'bg-white/[0.05]' : ''
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: TYPE_COLORS[m.type] ?? '#888' }}
                  />
                  <span className="flex-1 min-w-0">{m.name}</span>
                  <span className={`text-[10px] shrink-0 ${damageClassColors[m.damageClass] ?? ''}`}>
                    {m.damageClass.slice(0, 4)}
                  </span>
                  <span className="text-[10px] text-muted-foreground w-7 text-right shrink-0">
                    {m.power ?? '—'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
