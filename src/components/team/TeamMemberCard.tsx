'use client';

import { useCallback } from 'react';
import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { TypeBadge } from '@/components/pokemon/TypeBadge';
import { MoveSelector } from './MoveSelector';
import { AbilitySelector } from './AbilitySelector';
import { TeraTypeSelector } from './TeraTypeSelector';

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

interface TeamMemberCardProps {
  member: TeamMember;
  playthroughId: number;
  onUpdate: () => void;
  onRemove: (memberId: number) => void;
}

export function TeamMemberCard({ member, playthroughId, onUpdate, onRemove }: TeamMemberCardProps) {
  const updateField = useCallback(async (data: Record<string, unknown>) => {
    const res = await fetch(`/api/playthroughs/${playthroughId}/team/${member.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return;
    onUpdate();
  }, [playthroughId, member.id, onUpdate]);

  const handleMoveSelect = useCallback((slot: number, moveId: number | null) => {
    const field = `move${slot === 1 ? 'One' : slot === 2 ? 'Two' : slot === 3 ? 'Three' : 'Four'}Id`;
    updateField({ [field]: moveId });
  }, [updateField]);

  const handleAbilitySelect = useCallback((abilityId: number | null) => {
    updateField({ abilityId });
  }, [updateField]);

  const handleTeraSelect = useCallback((teraType: string | null) => {
    updateField({ teraType });
  }, [updateField]);

  // Get current move for each slot
  const getMoveForSlot = (slot: number): MoveData | null => {
    return member.moves.find((m) => m.slot === slot)?.move ?? null;
  };

  const dexNumber = member.pokemon.pokeapiId <= 10000
    ? `#${String(member.pokemon.pokeapiId).padStart(3, '0')}`
    : null;

  return (
    <div className="rounded-lg border border-border bg-card p-3 flex flex-col">
      {/* Header: sprite + name + remove */}
      <div className="flex items-start gap-3 mb-3">
        <div className="relative w-14 h-14 shrink-0">
          {member.pokemon.spriteDefault ? (
            <Image
              src={member.pokemon.spriteDefault}
              alt={member.pokemon.name}
              fill
              sizes="56px"
              className="object-contain pixelated"
              unoptimized
            />
          ) : (
            <div className="w-full h-full rounded bg-secondary flex items-center justify-center text-muted-foreground text-sm">
              ?
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold truncate">
              {member.nickname ?? member.pokemon.name}
            </h3>
            <button
              onClick={() => onRemove(member.id)}
              className="text-muted-foreground hover:text-red-400 transition-colors ml-auto shrink-0"
              title="Remove from team"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          {member.nickname && (
            <p className="text-[10px] text-muted-foreground">{member.pokemon.name}</p>
          )}
          {dexNumber && (
            <p className="text-[10px] font-mono text-muted-foreground">{dexNumber}</p>
          )}
          <div className="flex gap-1 mt-1">
            <TypeBadge type={member.pokemon.typeOne} />
            {member.pokemon.typeTwo && <TypeBadge type={member.pokemon.typeTwo} />}
          </div>
        </div>
      </div>

      {/* Ability + Tera */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <AbilitySelector
          pokemonId={member.pokemon.id}
          currentAbility={member.ability}
          onSelect={handleAbilitySelect}
        />
        <TeraTypeSelector
          currentType={member.teraType}
          onSelect={handleTeraSelect}
        />
      </div>

      {/* Moves */}
      <div className="grid grid-cols-2 gap-1.5">
        {[1, 2, 3, 4].map((slot) => (
          <MoveSelector
            key={slot}
            pokemonId={member.pokemon.id}
            slot={slot}
            currentMove={getMoveForSlot(slot)}
            onSelect={handleMoveSelect}
          />
        ))}
      </div>
    </div>
  );
}
