'use client';

import { useState, useCallback, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TeamMemberCard } from './TeamMemberCard';
import { PokemonSearchModal } from './PokemonSearchModal';
import { BenchSection } from './BenchSection';
import { TeamAnalysis } from './TeamAnalysis';

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

interface TeamGridProps {
  playthroughId: number;
  versionGroupId: number;
  initialTeam: TeamMember[];
}

export function TeamGrid({ playthroughId, versionGroupId, initialTeam }: TeamGridProps) {
  const [allMembers, setAllMembers] = useState<TeamMember[]>(initialTeam);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [teamRevision, setTeamRevision] = useState(0);

  const activeMembers = allMembers.filter((m) => m.slot !== null).sort((a, b) => a.slot! - b.slot!);
  const benchMembers = allMembers.filter((m) => m.slot === null);

  const refreshTeam = useCallback(async () => {
    try {
      const res = await fetch(`/api/playthroughs/${playthroughId}/team`);
      if (!res.ok) return;
      const json = await res.json();
      setAllMembers(json.data);
      setTeamRevision((r) => r + 1);
    } catch {
      // Silently fail — user can refresh
    }
  }, [playthroughId]);

  // Sync initialTeam on mount
  useEffect(() => {
    setAllMembers(initialTeam);
  }, [initialTeam]);

  const handleAddPokemon = useCallback(async (poke: { id: number }) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/playthroughs/${playthroughId}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pokemonId: poke.id }),
      });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error || 'Failed to add Pokémon');
        return;
      }
      const json = await res.json();
      await refreshTeam();
      toast.success(json.data?.benched ? 'Added to bench' : 'Added to team');
    } catch {
      toast.error('Failed to add Pokémon');
    } finally {
      setLoading(false);
    }
  }, [playthroughId, refreshTeam]);

  const handleRemove = useCallback(async (memberId: number) => {
    try {
      await fetch(`/api/playthroughs/${playthroughId}/team/${memberId}`, {
        method: 'DELETE',
      });
      await refreshTeam();
    } catch {
      toast.error('Failed to remove Pokémon');
    }
  }, [playthroughId, refreshTeam]);

  const handleBench = useCallback(async (memberId: number) => {
    try {
      const res = await fetch(`/api/playthroughs/${playthroughId}/team/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bench' }),
      });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error || 'Failed to bench');
        return;
      }
      toast.success('Moved to bench');
      await refreshTeam();
    } catch {
      toast.error('Failed to bench');
    }
  }, [playthroughId, refreshTeam]);

  const emptySlots = 6 - activeMembers.length;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeMembers.map((member) => (
          <TeamMemberCard
            key={member.id}
            member={member}
            playthroughId={playthroughId}
            onUpdate={refreshTeam}
            onRemove={handleRemove}
            onBench={handleBench}
          />
        ))}

        {/* Empty slots */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <button
            key={`empty-${i}`}
            onClick={() => setSearchOpen(true)}
            disabled={loading}
            className="rounded-xl border-2 border-dashed border-white/10 bg-surface-low p-6 flex flex-col items-center justify-center gap-3 hover:border-red-500/40 hover:bg-surface-mid transition-all min-h-[200px] disabled:opacity-50"
          >
            {loading && i === 0 ? (
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-surface-bright flex items-center justify-center group-hover:bg-red-500 transition-colors">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <span className="text-sm font-headline font-bold text-muted-foreground">Add Pokémon</span>
              </>
            )}
          </button>
        ))}
      </div>

      <BenchSection
        benchMembers={benchMembers}
        activeMembers={activeMembers}
        playthroughId={playthroughId}
        versionGroupId={versionGroupId}
        onRefresh={refreshTeam}
      />

      <PokemonSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={handleAddPokemon}
        versionGroupId={versionGroupId}
      />

      {/* Analysis Section */}
      <div className="mt-8">
        <TeamAnalysis playthroughId={playthroughId} teamSize={activeMembers.length} teamRevision={teamRevision} />
      </div>
    </>
  );
}
