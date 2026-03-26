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
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-label ${colors[damageClass] ?? colors.status}`}>
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
    <div className="rounded-xl ghost-border bg-card p-6 mt-6">
      <h2 className="font-headline font-bold mb-4">
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
                className="w-full rounded-xl border border-white/[0.08] bg-surface-bright pl-8 pr-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-red-500/50"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-white/[0.08] bg-surface-bright px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-red-500/50"
            >
              <option value="All">All Types</option>
              {POKEMON_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="rounded-xl border border-white/[0.08] bg-surface-bright px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-red-500/50"
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
                  <tr className="border-b border-white/[0.05] text-left">
                    <th className="pb-2 pr-4 text-xs text-muted-dim font-label">Move</th>
                    <th className="pb-2 pr-4 text-xs text-muted-dim font-label">Type</th>
                    <th className="pb-2 pr-4 text-xs text-muted-dim font-label">Cat.</th>
                    <th className="pb-2 pr-4 text-xs text-muted-dim font-label text-right">Pow</th>
                    <th className="pb-2 pr-4 text-xs text-muted-dim font-label text-right">Acc</th>
                    <th className="pb-2 text-xs text-muted-dim font-label text-right">PP</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((pm) => (
                    <tr key={pm.move.id} className="border-b border-white/[0.03] last:border-0">
                      <td className="py-2 pr-4 font-headline font-bold text-sm">{pm.move.name}</td>
                      <td className="py-1.5 pr-4">
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-[10px] font-label font-bold uppercase text-white"
                          style={{ backgroundColor: typeColors[pm.move.type] ?? '#888' }}
                        >
                          {pm.move.type}
                        </span>
                      </td>
                      <td className="py-1.5 pr-4">
                        <DamageClassBadge damageClass={pm.move.damageClass} />
                      </td>
                      <td className="py-1.5 pr-4 text-right font-label">
                        {pm.move.power ?? '—'}
                      </td>
                      <td className="py-1.5 pr-4 text-right font-label">
                        {pm.move.accuracy ? `${pm.move.accuracy}%` : '—'}
                      </td>
                      <td className="py-1.5 text-right font-label">{pm.move.pp}</td>
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
