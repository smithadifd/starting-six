'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { POKEMON_TYPES } from '@/types';

interface MoveData {
  id: number;
  name: string;
  slug: string;
  type: string;
  damageClass: string;
  power: number | null;
  accuracy: number | null;
  pp: number;
}

interface MoveFilterProps {
  moves: Array<{ move: MoveData }>;
  typeColors: Record<string, string>;
}

const DAMAGE_CLASSES = ['All', 'physical', 'special', 'status'] as const;

function DamageClassBadge({ damageClass }: { damageClass: string }) {
  const colors: Record<string, string> = {
    physical: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    special: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    status: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${colors[damageClass] ?? colors.status}`}>
      {damageClass}
    </span>
  );
}

export function MoveFilter({ moves, typeColors }: MoveFilterProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [classFilter, setClassFilter] = useState('All');

  const filtered = useMemo(() => {
    return moves.filter((pm) => {
      if (search && !pm.move.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== 'All' && pm.move.type !== typeFilter) return false;
      if (classFilter !== 'All' && pm.move.damageClass !== classFilter) return false;
      return true;
    });
  }, [moves, search, typeFilter, classFilter]);

  const hasFilters = search || typeFilter !== 'All' || classFilter !== 'All';

  return (
    <div className="rounded-lg border border-border bg-card p-6 mt-6">
      <h2 className="font-semibold mb-4">
        Learnset{' '}
        <span className="text-sm font-normal text-muted-foreground">
          ({hasFilters ? `${filtered.length} / ${moves.length}` : `${moves.length}`} moves)
        </span>
      </h2>

      {moves.length === 0 ? (
        <p className="text-sm text-muted-foreground">No move data synced yet.</p>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search moves..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="All">All Types</option>
              {POKEMON_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {DAMAGE_CLASSES.map((c) => (
                <option key={c} value={c}>{c === 'All' ? 'All Classes' : c}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No moves match your filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 pr-4 text-xs text-muted-foreground font-medium">Move</th>
                    <th className="pb-2 pr-4 text-xs text-muted-foreground font-medium">Type</th>
                    <th className="pb-2 pr-4 text-xs text-muted-foreground font-medium">Cat.</th>
                    <th className="pb-2 pr-4 text-xs text-muted-foreground font-medium text-right">Pow</th>
                    <th className="pb-2 pr-4 text-xs text-muted-foreground font-medium text-right">Acc</th>
                    <th className="pb-2 text-xs text-muted-foreground font-medium text-right">PP</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((pm) => (
                    <tr key={pm.move.id} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5 pr-4 font-medium">{pm.move.name}</td>
                      <td className="py-1.5 pr-4">
                        <span
                          className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase text-white"
                          style={{ backgroundColor: typeColors[pm.move.type] ?? '#888' }}
                        >
                          {pm.move.type}
                        </span>
                      </td>
                      <td className="py-1.5 pr-4">
                        <DamageClassBadge damageClass={pm.move.damageClass} />
                      </td>
                      <td className="py-1.5 pr-4 text-right font-mono">
                        {pm.move.power ?? '—'}
                      </td>
                      <td className="py-1.5 pr-4 text-right font-mono">
                        {pm.move.accuracy ? `${pm.move.accuracy}%` : '—'}
                      </td>
                      <td className="py-1.5 text-right font-mono">{pm.move.pp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
