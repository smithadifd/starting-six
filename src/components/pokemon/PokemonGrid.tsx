'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Database } from 'lucide-react';
import { PokemonCard } from './PokemonCard';
import { PokemonSearch } from './PokemonSearch';

interface PokemonRow {
  slug: string;
  name: string;
  pokeapiId: number;
  typeOne: string;
  typeTwo: string | null;
  spriteDefault: string | null;
  isLegendary: boolean;
  isMythical: boolean;
}

const PAGE_SIZE = 48;

export function PokemonGrid() {
  const [pokemon, setPokemon] = useState<PokemonRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [generation, setGeneration] = useState('');

  const fetchPage = useCallback(async (p: number, filters: { search: string; type: string; generation: string }, append: boolean) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('pageSize', String(PAGE_SIZE));
      if (filters.search) params.set('search', filters.search);
      if (filters.type) params.set('type', filters.type);
      if (filters.generation) params.set('generation', filters.generation);

      const res = await fetch(`/api/pokemon?${params}`);
      if (!res.ok) return;
      const json = await res.json();
      const rows = json.data as PokemonRow[];
      const meta = json.meta as { total: number };

      setPokemon((prev) => (append ? [...prev, ...rows] : rows));
      setTotal(meta.total);
      setPage(p);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, []);

  // Initial load + filter changes
  useEffect(() => {
    fetchPage(1, { search, type, generation }, false);
  }, [search, type, generation, fetchPage]);

  const hasMore = pokemon.length < total;

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchPage(page + 1, { search, type, generation }, true);
    }
  }, [loading, hasMore, page, search, type, generation, fetchPage]);

  if (initialLoad) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PokemonSearch
        search={search}
        type={type}
        generation={generation}
        onSearchChange={setSearch}
        onTypeChange={setType}
        onGenerationChange={setGeneration}
      />

      <p className="text-sm text-muted-foreground">
        {total.toLocaleString()} Pokémon found
      </p>

      {total === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">No Pokémon found</h2>
          <p className="text-sm text-muted-foreground">
            {pokemon.length === 0 && !search && !type && !generation
              ? 'Run a PokéAPI sync from Settings → System to import data.'
              : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {pokemon.map((p) => (
              <PokemonCard key={p.slug} pokemon={p} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2 pb-4">
              <button
                onClick={loadMore}
                disabled={loading}
                className="flex items-center gap-2 rounded-md border border-border bg-card px-6 py-2.5 text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {loading ? 'Loading...' : `Load more (${pokemon.length} of ${total.toLocaleString()})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
