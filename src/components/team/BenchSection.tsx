'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { ArrowUpFromLine, Trash2, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TypeBadge } from '@/components/pokemon/TypeBadge';
import { SwapModal } from './SwapModal';
import { PokemonSearchModal } from './PokemonSearchModal';
import { TYPE_COLORS } from '../../../tailwind.config';

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

interface TeamMember {
  id: number;
  slot: number | null;
  nickname: string | null;
  teraType: string | null;
  pokemon: {
    id: number;
    name: string;
    slug: string;
    typeOne: string;
    typeTwo: string | null;
    spriteDefault: string | null;
    pokeapiId: number;
  };
  ability: { id: number; name: string; slug: string; effectShort: string | null } | null;
  moves: Array<{ slot: number; move: MoveData }>;
}

interface BenchSectionProps {
  benchMembers: TeamMember[];
  activeMembers: TeamMember[];
  playthroughId: number;
  versionGroupId: number;
  onRefresh: () => void;
}

export function BenchSection({ benchMembers, activeMembers, playthroughId, versionGroupId, onRefresh }: BenchSectionProps) {
  const [swapTarget, setSwapTarget] = useState<TeamMember | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [addingToBench, setAddingToBench] = useState(false);

  const hasEmptySlots = activeMembers.length < 6;

  const handleSwap = useCallback(async (benchMemberId: number, activeSlot: number) => {
    try {
      const res = await fetch(`/api/playthroughs/${playthroughId}/team/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ benchMemberId, activeSlot }),
      });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error || 'Failed to swap');
        return;
      }
      toast.success('Swapped');
      onRefresh();
    } catch {
      toast.error('Failed to swap');
    }
  }, [playthroughId, onRefresh]);

  const handleActivate = useCallback(async (benchMemberId: number) => {
    try {
      const res = await fetch(`/api/playthroughs/${playthroughId}/team/${benchMemberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate' }),
      });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error || 'Failed to activate');
        return;
      }
      toast.success('Moved to team');
      onRefresh();
    } catch {
      toast.error('Failed to activate');
    }
  }, [playthroughId, onRefresh]);

  const handleRemove = useCallback(async (memberId: number) => {
    try {
      await fetch(`/api/playthroughs/${playthroughId}/team/${memberId}`, {
        method: 'DELETE',
      });
      onRefresh();
    } catch {
      toast.error('Failed to remove');
    }
  }, [playthroughId, onRefresh]);

  const handleAddToBench = useCallback(async (poke: { id: number }) => {
    setAddingToBench(true);
    try {
      const res = await fetch(`/api/playthroughs/${playthroughId}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pokemonId: poke.id }),
      });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error || 'Failed to add');
        return;
      }
      const json = await res.json();
      toast.success(json.data?.benched ? 'Added to bench' : 'Added to team');
      onRefresh();
    } catch {
      toast.error('Failed to add');
    } finally {
      setAddingToBench(false);
    }
  }, [playthroughId, onRefresh]);

  return (
    <>
      <div className="mt-10">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-lg font-headline font-extrabold text-muted-foreground">
            Bench
          </h3>
          {benchMembers.length > 0 && (
            <span className="font-label text-muted-dim bg-surface-bright px-2.5 py-0.5 rounded-full text-xs tracking-wider">
              {benchMembers.length}
            </span>
          )}
          <button
            onClick={() => setSearchOpen(true)}
            disabled={addingToBench}
            className="ml-auto flex items-center gap-1.5 text-xs font-label px-3 py-1.5 rounded-lg bg-surface-bright text-muted-foreground hover:text-foreground hover:bg-surface-high transition-all disabled:opacity-50"
          >
            {addingToBench ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Add to Bench
          </button>
        </div>

        {benchMembers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-surface-low p-6 text-center">
            <p className="text-sm text-muted-dim font-body">
              Caught Pokemon beyond your team of 6 will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {benchMembers.map((member) => {
              const typeColor = TYPE_COLORS[member.pokemon.typeOne] ?? '#888888';
              return (
                <div
                  key={member.id}
                  className="rounded-xl p-3 transition-all hover:scale-[1.02]"
                  style={{
                    background: `linear-gradient(135deg, ${typeColor}10, transparent 55%), hsl(var(--card))`,
                    borderTop: `2px solid ${typeColor}30`,
                    borderLeft: '1px solid rgba(255,255,255,0.04)',
                    borderRight: '1px solid rgba(255,255,255,0.04)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="relative w-10 h-10 shrink-0">
                      {member.pokemon.spriteDefault ? (
                        <Image
                          src={member.pokemon.spriteDefault}
                          alt={member.pokemon.name}
                          fill
                          sizes="40px"
                          className="object-contain pixelated"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full rounded-lg bg-surface-bright flex items-center justify-center text-muted-foreground text-xs">?</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-headline font-bold truncate">
                        {member.nickname ?? member.pokemon.name}
                      </p>
                      {member.nickname && (
                        <p className="text-[9px] text-muted-dim truncate">{member.pokemon.name}</p>
                      )}
                      <div className="flex gap-0.5 mt-0.5">
                        <TypeBadge type={member.pokemon.typeOne} />
                        {member.pokemon.typeTwo && <TypeBadge type={member.pokemon.typeTwo} />}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-white/5">
                    {hasEmptySlots ? (
                      <button
                        onClick={() => handleActivate(member.id)}
                        className="flex-1 flex items-center justify-center gap-1 text-[10px] font-label px-2 py-1 rounded-md bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                        title="Move to team"
                      >
                        <ArrowUpFromLine className="h-3 w-3" />
                        To Team
                      </button>
                    ) : (
                      <button
                        onClick={() => setSwapTarget(member)}
                        className="flex-1 flex items-center justify-center gap-1 text-[10px] font-label px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                        title="Swap with active team member"
                      >
                        <ArrowUpFromLine className="h-3 w-3" />
                        Swap In
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(member.id)}
                      className="flex items-center justify-center p-1 rounded-md text-muted-dim hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      title="Release"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {swapTarget && (
        <SwapModal
          open={!!swapTarget}
          onClose={() => setSwapTarget(null)}
          benchMember={swapTarget}
          activeMembers={activeMembers}
          onSwap={handleSwap}
          onActivate={handleActivate}
        />
      )}

      <PokemonSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={handleAddToBench}
        versionGroupId={versionGroupId}
      />
    </>
  );
}
