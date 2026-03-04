'use client';

import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface TeamMember {
  pokemon: {
    name: string;
    typeOne: string;
    typeTwo: string | null;
  };
  nickname: string | null;
  teraType: string | null;
  ability: { name: string } | null;
  moves: Array<{ move: { name: string } }>;
}

interface TeamExportProps {
  team: TeamMember[];
  playthroughName: string;
}

function formatTeam(team: TeamMember[], playthroughName: string): string {
  const lines: string[] = [`=== ${playthroughName} ===`, ''];

  for (let i = 0; i < team.length; i++) {
    const m = team[i];
    const displayName = m.nickname ? `${m.nickname} (${m.pokemon.name})` : m.pokemon.name;
    lines.push(`${i + 1}. ${displayName}`);

    const types = m.pokemon.typeTwo
      ? `${m.pokemon.typeOne} / ${m.pokemon.typeTwo}`
      : m.pokemon.typeOne;
    lines.push(`   Type: ${types}`);

    if (m.ability) lines.push(`   Ability: ${m.ability.name}`);
    if (m.teraType) lines.push(`   Tera: ${m.teraType}`);

    if (m.moves.length > 0) {
      const moveNames = m.moves.map((mv) => mv.move.name).join(' / ');
      lines.push(`   Moves: ${moveNames}`);
    }

    if (i < team.length - 1) lines.push('');
  }

  return lines.join('\n');
}

export function TeamExport({ team, playthroughName }: TeamExportProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      const text = formatTeam(team, playthroughName);
      await navigator.clipboard.writeText(text);
      toast.success('Team copied to clipboard');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [team, playthroughName]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      title="Copy team to clipboard"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
