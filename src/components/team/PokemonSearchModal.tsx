'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Search, X, Loader2 } from 'lucide-react';
import { TypeBadge } from '@/components/pokemon/TypeBadge';
import { TYPE_COLORS } from '../../../tailwind.config';

interface PokemonResult {
  id: number;
  slug: string;
  name: string;
  pokeapiId: number;
  typeOne: string;
  typeTwo: string | null;
  spriteDefault: string | null;
}

interface PokemonSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (pokemon: PokemonResult) => void;
  versionGroupId?: number;
}

export function PokemonSearchModal({ open, onClose, onSelect, versionGroupId }: PokemonSearchModalProps) {
  const [results, setResults] = useState<PokemonResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchPokemon = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('pageSize', '50');
      if (query) params.set('search', query);
      if (versionGroupId) params.set('versionGroupId', String(versionGroupId));

      const res = await fetch(`/api/pokemon?${params}`);
      if (!res.ok) return;
      const json = await res.json();
      setResults(json.data as PokemonResult[]);
      setTotal(json.meta?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [versionGroupId]);

  // Fetch on open and search changes
  useEffect(() => {
    if (!open) return;
    fetchPokemon(search);
  }, [open, search, fetchPokemon]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearch('');
      setResults([]);
    }
  }, [open]);

  const handleInput = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(inputRef.current?.value ?? '');
    }, 300);
  }, []);

  const handleSelect = useCallback((poke: PokemonResult) => {
    onSelect(poke);
    onClose();
  }, [onSelect, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 rounded-xl ghost-border bg-card shadow-2xl flex flex-col max-h-[70vh]">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-white/[0.05]">
          <Search className="h-4 w-4 text-muted-dim shrink-0" />
          <input
            ref={inputRef}
            type="text"
            defaultValue=""
            onInput={handleInput}
            placeholder="Search Pokémon by name..."
            className="flex-1 bg-transparent text-sm font-body outline-none placeholder:text-muted-dim"
          />
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 font-body">
              {search ? 'No Pokémon found' : 'Start typing to search...'}
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-dim font-label px-2 pb-2">
                {total > 50 ? `Showing 50 of ${total}` : `${total} result${total !== 1 ? 's' : ''}`}
              </p>
              <div className="space-y-0.5">
                {results.map((poke) => {
                  const typeColor = TYPE_COLORS[poke.typeOne] ?? '#888';
                  return (
                    <button
                      key={poke.id}
                      onClick={() => handleSelect(poke)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-all text-left"
                      style={{ '--glow-color': `${typeColor}1A` } as React.CSSProperties}
                    >
                      <div className="relative w-10 h-10 shrink-0">
                        {poke.spriteDefault ? (
                          <Image
                            src={poke.spriteDefault}
                            alt={poke.name}
                            fill
                            sizes="40px"
                            className="object-contain pixelated"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full rounded-xl bg-surface-bright flex items-center justify-center text-xs text-muted-foreground">?</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-headline font-bold truncate">{poke.name}</span>
                          {poke.pokeapiId <= 10000 && (
                            <span className="text-[10px] font-label text-muted-dim">
                              #{String(poke.pokeapiId).padStart(3, '0')}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 mt-0.5">
                          <TypeBadge type={poke.typeOne} />
                          {poke.typeTwo && <TypeBadge type={poke.typeTwo} />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
