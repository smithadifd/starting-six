'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

interface Ability {
  id: number;
  name: string;
  slug: string;
  effectShort: string | null;
  slot: number;
  isHidden: boolean;
}

interface AbilitySelectorProps {
  pokemonId: number;
  currentAbility: { id: number; name: string } | null;
  onSelect: (abilityId: number | null) => void;
}

export function AbilitySelector({ pokemonId, currentAbility, onSelect }: AbilitySelectorProps) {
  const [open, setOpen] = useState(false);
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchAbilities = useCallback(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    fetch(`/api/pokemon/${pokemonId}/moves?include=abilities`)
      .then((res) => res.json())
      .then((json) => setAbilities(json.data?.abilities ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pokemonId]);

  const handleOpen = useCallback(() => {
    setOpen((prev) => {
      if (!prev) fetchAbilities();
      return !prev;
    });
  }, [fetchAbilities]);

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

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleOpen}
        className="w-full flex items-center justify-between gap-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs hover:bg-secondary/50 transition-colors"
      >
        <span className={currentAbility ? '' : 'text-muted-foreground'}>
          {currentAbility?.name ?? 'Ability'}
        </span>
        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute z-40 top-full left-0 right-0 mt-1 rounded-md border border-border bg-card shadow-lg">
          <div className="p-1">
            {loading ? (
              <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
            ) : abilities.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No abilities found</p>
            ) : (
              abilities.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    onSelect(a.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-2 py-2 rounded text-xs hover:bg-secondary transition-colors ${
                    currentAbility?.id === a.id ? 'bg-secondary' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{a.name}</span>
                    {a.isHidden && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-secondary text-muted-foreground">
                        Hidden
                      </span>
                    )}
                  </div>
                  {a.effectShort && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                      {a.effectShort}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
