'use client';

import { useCallback } from 'react';
import Image from 'next/image';
import { Trash2, ArrowDownToLine } from 'lucide-react';
import { TypeBadge } from '@/components/pokemon/TypeBadge';
import { MoveSelector } from './MoveSelector';
import { AbilitySelector } from './AbilitySelector';
import { TeraTypeSelector } from './TeraTypeSelector';
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

interface TeamMemberCardProps {
  member: TeamMember;
  playthroughId: number;
  onUpdate: () => void;
  onRemove: (memberId: number) => void;
  onBench?: (memberId: number) => void;
}

export function TeamMemberCard({ member, playthroughId, onUpdate, onRemove, onBench }: TeamMemberCardProps) {
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

  const typeColor = TYPE_COLORS[member.pokemon.typeOne] ?? '#888888';

  return (
    <div
      className="rounded-2xl p-4 flex flex-col transition-all hover:scale-[1.01]"
      style={{
        background: `linear-gradient(135deg, ${typeColor}15, transparent 55%), hsl(var(--card))`,
        borderTop: `2px solid ${typeColor}50`,
        borderLeft: '1px solid rgba(255,255,255,0.04)',
        borderRight: '1px solid rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Header: sprite + name + remove */}
      <div className="flex items-start gap-3 mb-3">
        <div className="relative w-14 h-14 shrink-0">
          {member.pokemon.spriteDefault ? (
            <Image
              src={member.pokemon.spriteDefault}
              alt={member.pokemon.name}
              fill
              sizes="56px"
              className="object-contain pixelated z-10 relative"
              unoptimized
            />
          ) : (
            <div className="w-full h-full rounded-xl bg-surface-bright flex items-center justify-center text-muted-foreground text-sm">
              ?
            </div>
          )}
          {/* Type glow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full blur-xl opacity-40"
            style={{ backgroundColor: typeColor }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-headline font-bold truncate">
              {member.nickname ?? member.pokemon.name}
            </h3>
            <div className="flex items-center gap-1 ml-auto shrink-0">
              {onBench && (
                <button
                  onClick={() => onBench(member.id)}
                  className="text-muted-dim hover:text-blue-400 transition-colors"
                  title="Move to bench"
                >
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => onRemove(member.id)}
                className="text-muted-dim hover:text-red-500 transition-colors"
                title="Remove from team"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {member.nickname && (
            <p className="text-[10px] text-muted-dim">{member.pokemon.name}</p>
          )}
          {dexNumber && (
            <p className="text-[10px] font-label text-muted-dim">{dexNumber}</p>
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
