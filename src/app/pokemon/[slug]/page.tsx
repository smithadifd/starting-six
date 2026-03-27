import { redirect, notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUserId } from '@/lib/auth-helpers';
import { getPokemonBySlug, getPokemonAbilities, getPokemonMoves } from '@/lib/db/queries';
import { TypeBadge } from '@/components/pokemon/TypeBadge';
import { MoveFilter } from '@/components/pokemon/MoveFilter';
import { TYPE_COLORS } from '../../../../tailwind.config';

export const dynamic = 'force-dynamic';

const STAT_LABELS: Record<string, string> = {
  statHp: 'HP',
  statAtk: 'Attack',
  statDef: 'Defense',
  statSpAtk: 'Sp. Atk',
  statSpDef: 'Sp. Def',
  statSpd: 'Speed',
};

const STAT_MAX = 255;

function statBarColor(value: number): string {
  if (value < 50) return '#ef4444';
  if (value < 80) return '#f97316';
  if (value < 100) return '#eab308';
  if (value < 130) return '#22c55e';
  return '#3b82f6';
}

export default async function PokemonDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    await requireUserId();
  } catch {
    redirect('/login');
  }

  const poke = getPokemonBySlug(slug);
  if (!poke) notFound();

  const pokeAbilities = getPokemonAbilities(poke.id);
  const pokeMoves = getPokemonMoves(poke.id);

  const dexNumber = poke.pokeapiId <= 10000
    ? `#${String(poke.pokeapiId).padStart(3, '0')}`
    : null;

  const typeColor = TYPE_COLORS[poke.typeOne] ?? '#888888';

  const stats = [
    { key: 'statHp', value: poke.statHp },
    { key: 'statAtk', value: poke.statAtk },
    { key: 'statDef', value: poke.statDef },
    { key: 'statSpAtk', value: poke.statSpAtk },
    { key: 'statSpDef', value: poke.statSpDef },
    { key: 'statSpd', value: poke.statSpd },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/pokemon"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 font-label"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Pokémon
      </Link>

      {/* Header */}
      <div
        className="rounded-2xl p-8 mb-8 relative overflow-hidden"
        style={{
          background: `radial-gradient(ellipse at 15% 50%, ${typeColor}20, transparent 55%), hsl(var(--card))`,
          borderTop: `2px solid ${typeColor}40`,
          borderLeft: '1px solid rgba(255,255,255,0.04)',
          borderRight: '1px solid rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
          {/* Sprite */}
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 shrink-0">
            {poke.spriteDefault ? (
              <Image
                src={poke.spriteDefault}
                alt={poke.name}
                fill
                sizes="176px"
                className="object-contain pixelated z-10 relative"
                unoptimized
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-surface-bright flex items-center justify-center text-2xl text-muted-foreground">
                ?
              </div>
            )}
            {/* Type glow behind sprite — large and prominent */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full blur-3xl opacity-50"
              style={{ backgroundColor: typeColor }}
            />
          </div>

          <div className="flex-1 text-center sm:text-left">
            {dexNumber && (
              <span className="text-base font-label font-bold text-muted-dim">{dexNumber}</span>
            )}
            <h1 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter">{poke.name}</h1>
            {poke.formName && (
              <p className="text-sm text-muted-foreground font-body">{poke.speciesName} — {poke.formName} Form</p>
            )}

            <div className="flex gap-2 mt-3 justify-center sm:justify-start">
              <TypeBadge type={poke.typeOne} size="md" />
              {poke.typeTwo && <TypeBadge type={poke.typeTwo} size="md" />}
            </div>

            <div className="flex gap-3 mt-3 text-xs text-muted-foreground justify-center sm:justify-start font-label">
              <span>Gen {poke.generation}</span>
              {poke.isLegendary && (
                <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">
                  Legendary
                </span>
              )}
              {poke.isMythical && (
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20">
                  Mythical
                </span>
              )}
              {poke.isBaby && (
                <span className="px-2.5 py-0.5 rounded-full bg-pink-500/15 text-pink-400 border border-pink-500/20">
                  Baby
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stats */}
        <div className="rounded-xl ghost-border bg-card p-6">
          <h2 className="font-headline font-bold mb-4">Base Stats</h2>
          <div className="space-y-3">
            {stats.map((stat) => (
              <div key={stat.key} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-label w-16 text-right shrink-0">
                  {STAT_LABELS[stat.key]}
                </span>
                <span className="text-sm font-label font-bold w-8 text-right shrink-0">{stat.value}</span>
                <div className="flex-1 h-2.5 rounded-full bg-surface-bright overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all stat-bar"
                    style={{
                      '--stat-pct': `${(stat.value / STAT_MAX) * 100}%`,
                      backgroundColor: statBarColor(stat.value),
                      boxShadow: `0 0 8px ${statBarColor(stat.value)}66`,
                    } as React.CSSProperties}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/[0.05]">
            <span className="text-xs text-muted-foreground font-label w-16 text-right shrink-0">BST</span>
            <span className="text-sm font-headline font-extrabold w-8 text-right shrink-0">{poke.bst}</span>
          </div>
        </div>

        {/* Abilities */}
        <div className="rounded-xl ghost-border bg-card p-6">
          <h2 className="font-headline font-bold mb-4">Abilities</h2>
          {pokeAbilities.length === 0 ? (
            <p className="text-sm text-muted-foreground font-body">No ability data synced yet.</p>
          ) : (
            <div className="space-y-3">
              {pokeAbilities.map((pa) => (
                <div
                  key={pa.slot}
                  className={`p-4 rounded-xl ${
                    pa.ability.isNotable
                      ? 'border border-yellow-500/20 bg-yellow-500/5'
                      : 'bg-surface-bright/50 ghost-border'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-headline font-bold text-sm">{pa.ability.name}</span>
                    {pa.isHidden && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-bright text-muted-dim font-label">
                        Hidden
                      </span>
                    )}
                    {pa.ability.isNotable && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 font-label">
                        Notable
                      </span>
                    )}
                  </div>
                  {pa.ability.effectShort && (
                    <p className="text-xs text-muted-foreground mt-1 font-body">{pa.ability.effectShort}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Learnset */}
      <MoveFilter moves={pokeMoves} typeColors={TYPE_COLORS} />
    </div>
  );
}
