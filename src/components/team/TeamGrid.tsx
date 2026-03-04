'use client';

import { useState, useCallback, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TeamMemberCard } from './TeamMemberCard';
import { PokemonSearchModal } from './PokemonSearchModal';

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
  slot: number;
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
  const [team, setTeam] = useState<TeamMember[]>(initialTeam);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const refreshTeam = useCallback(async () => {
    try {
      const res = await fetch(`/api/playthroughs/${playthroughId}/team`);
      if (!res.ok) return;
      const json = await res.json();
      setTeam(json.data);
    } catch {
      // Silently fail — user can refresh
    }
  }, [playthroughId]);

  // Sync initialTeam on mount
  useEffect(() => {
    setTeam(initialTeam);
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
      await refreshTeam();
      toast.success('Added to team');
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

  const emptySlots = 6 - team.length;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {team.map((member) => (
          <TeamMemberCard
            key={member.id}
            member={member}
            playthroughId={playthroughId}
            onUpdate={refreshTeam}
            onRemove={handleRemove}
          />
        ))}

        {/* Empty slots */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <button
            key={`empty-${i}`}
            onClick={() => setSearchOpen(true)}
            disabled={loading}
            className="rounded-lg border-2 border-dashed border-border bg-card/50 p-6 flex flex-col items-center justify-center gap-2 hover:border-red-400/50 hover:bg-card transition-colors min-h-[200px] disabled:opacity-50"
          >
            {loading && i === 0 ? (
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            ) : (
              <>
                <Plus className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Add Pokémon</span>
              </>
            )}
          </button>
        ))}
      </div>

      <PokemonSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={handleAddPokemon}
        versionGroupId={versionGroupId}
      />
    </>
  );
}
