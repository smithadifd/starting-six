'use client';

import { useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { POKEMON_TYPES } from '@/types';

interface PokemonSearchProps {
  search: string;
  type: string;
  generation: string;
  onSearchChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onGenerationChange: (value: string) => void;
}

export function PokemonSearch({
  search,
  type,
  generation,
  onSearchChange,
  onTypeChange,
  onGenerationChange,
}: PokemonSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearchInput = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearchChange(inputRef.current?.value ?? '');
    }, 300);
  }, [onSearchChange]);

  const clearSearch = useCallback(() => {
    if (inputRef.current) inputRef.current.value = '';
    onSearchChange('');
  }, [onSearchChange]);

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-dim" />
        <input
          ref={inputRef}
          type="text"
          defaultValue={search}
          onInput={handleSearchInput}
          placeholder="Search Pokémon..."
          className="w-full rounded-xl border border-white/[0.08] bg-surface-bright pl-9 pr-8 py-2.5 text-sm font-body placeholder:text-muted-dim focus:outline-none focus:ring-2 focus:ring-red-500/50"
        />
        {search && (
          <button
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Type filter */}
      <select
        value={type}
        onChange={(e) => onTypeChange(e.target.value)}
        className="rounded-xl border border-white/[0.08] bg-surface-bright px-3 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-red-500/50"
      >
        <option value="">All Types</option>
        {POKEMON_TYPES.map((t) => (
          <option key={t} value={t}>
            {t[0].toUpperCase() + t.slice(1)}
          </option>
        ))}
      </select>

      {/* Generation filter */}
      <select
        value={generation}
        onChange={(e) => onGenerationChange(e.target.value)}
        className="rounded-xl border border-white/[0.08] bg-surface-bright px-3 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-red-500/50"
      >
        <option value="">All Gens</option>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => (
          <option key={g} value={g}>
            Gen {g}
          </option>
        ))}
      </select>
    </div>
  );
}
