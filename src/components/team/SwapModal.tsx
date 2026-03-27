'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, ArrowLeftRight } from 'lucide-react';
import { TypeBadge } from '@/components/pokemon/TypeBadge';

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

interface SwapModalProps {
  open: boolean;
  onClose: () => void;
  benchMember: TeamMember;
  activeMembers: TeamMember[];
  onSwap: (benchMemberId: number, activeSlot: number) => void;
  onActivate: (benchMemberId: number) => void;
}

export function SwapModal({ open, onClose, benchMember, activeMembers, onSwap, onActivate }: SwapModalProps) {
  const [swapping, setSwapping] = useState(false);

  if (!open) return null;

  const filledSlots = activeMembers.map((m) => m.slot!);
  const emptySlots: number[] = [];
  for (let s = 1; s <= 6; s++) {
    if (!filledSlots.includes(s)) emptySlots.push(s);
  }

  const handleSlotClick = async (slot: number, hasOccupant: boolean) => {
    setSwapping(true);
    try {
      if (hasOccupant) {
        onSwap(benchMember.id, slot);
      } else {
        onActivate(benchMember.id);
      }
    } finally {
      setSwapping(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl ghost-border max-w-md w-full p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Bench member being swapped in */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative w-12 h-12 shrink-0">
            {benchMember.pokemon.spriteDefault ? (
              <Image
                src={benchMember.pokemon.spriteDefault}
                alt={benchMember.pokemon.name}
                fill
                sizes="48px"
                className="object-contain pixelated"
                unoptimized
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-surface-bright flex items-center justify-center text-muted-foreground text-sm">?</div>
            )}
          </div>
          <div>
            <h3 className="font-headline font-bold text-sm">
              Swap in {benchMember.nickname ?? benchMember.pokemon.name}
            </h3>
            <div className="flex gap-1 mt-0.5">
              <TypeBadge type={benchMember.pokemon.typeOne} />
              {benchMember.pokemon.typeTwo && <TypeBadge type={benchMember.pokemon.typeTwo} />}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground font-label mb-3">Choose a slot:</p>

        {/* Slot options */}
        <div className="space-y-2">
          {/* Empty slots first */}
          {emptySlots.map((slot) => (
            <button
              key={`empty-${slot}`}
              disabled={swapping}
              onClick={() => handleSlotClick(slot, false)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-white/10 bg-surface-low hover:border-green-500/40 hover:bg-surface-mid transition-all disabled:opacity-50"
            >
              <span className="text-xs font-label text-muted-dim w-6">#{slot}</span>
              <span className="text-sm text-muted-foreground">Empty slot — move to team</span>
            </button>
          ))}

          {/* Active members */}
          {activeMembers
            .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
            .map((member) => (
              <button
                key={member.id}
                disabled={swapping}
                onClick={() => handleSlotClick(member.slot!, true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl ghost-border bg-surface-low hover:border-red-500/30 hover:bg-surface-mid transition-all disabled:opacity-50"
              >
                <span className="text-xs font-label text-muted-dim w-6">#{member.slot}</span>
                <div className="relative w-8 h-8 shrink-0">
                  {member.pokemon.spriteDefault ? (
                    <Image
                      src={member.pokemon.spriteDefault}
                      alt={member.pokemon.name}
                      fill
                      sizes="32px"
                      className="object-contain pixelated"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full rounded bg-surface-bright flex items-center justify-center text-muted-foreground text-xs">?</div>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-headline font-bold truncate">
                    {member.nickname ?? member.pokemon.name}
                  </p>
                  <div className="flex gap-1 mt-0.5">
                    <TypeBadge type={member.pokemon.typeOne} />
                    {member.pokemon.typeTwo && <TypeBadge type={member.pokemon.typeTwo} />}
                  </div>
                </div>
                <ArrowLeftRight className="h-4 w-4 text-muted-dim shrink-0" />
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
