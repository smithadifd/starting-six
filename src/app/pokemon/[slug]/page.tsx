import { redirect, notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUserId } from '@/lib/auth-helpers';
import { getPokemonBySlug, getPokemonAbilities, getPokemonMoves } from '@/lib/db/queries';
import { TypeBadge } from '@/components/pokemon/TypeBadge';
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

interface DamageClassBadgeProps {
  damageClass: string;
}

function DamageClassBadge({ damageClass }: DamageClassBadgeProps) {
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
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Pokémon
      </Link>

      {/* Header */}
      <div className="rounded-lg border border-border bg-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Sprite */}
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 shrink-0">
            {poke.spriteDefault ? (
              <Image
                src={poke.spriteDefault}
                alt={poke.name}
                fill
                sizes="160px"
                className="object-contain pixelated"
                unoptimized
              />
            ) : (
              <div className="w-full h-full rounded-lg bg-secondary flex items-center justify-center text-2xl text-muted-foreground">
                ?
              </div>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left">
            {dexNumber && (
              <span className="text-sm font-mono text-muted-foreground">{dexNumber}</span>
            )}
            <h1 className="text-3xl font-bold">{poke.name}</h1>
            {poke.formName && (
              <p className="text-sm text-muted-foreground">{poke.speciesName} — {poke.formName} Form</p>
            )}

            <div className="flex gap-2 mt-3 justify-center sm:justify-start">
              <TypeBadge type={poke.typeOne} size="md" />
              {poke.typeTwo && <TypeBadge type={poke.typeTwo} size="md" />}
            </div>

            <div className="flex gap-3 mt-3 text-xs text-muted-foreground justify-center sm:justify-start">
              <span>Gen {poke.generation}</span>
              {poke.isLegendary && (
                <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                  Legendary
                </span>
              )}
              {poke.isMythical && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  Mythical
                </span>
              )}
              {poke.isBaby && (
                <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30">
                  Baby
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stats */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-semibold mb-4">Base Stats</h2>
          <div className="space-y-3">
            {stats.map((stat) => (
              <div key={stat.key} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
                  {STAT_LABELS[stat.key]}
                </span>
                <span className="text-sm font-mono w-8 text-right shrink-0">{stat.value}</span>
                <div className="flex-1 h-2.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all stat-fill"
                    style={{
                      width: `${(stat.value / STAT_MAX) * 100}%`,
                      backgroundColor: statBarColor(stat.value),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground w-16 text-right shrink-0">BST</span>
            <span className="text-sm font-bold w-8 text-right shrink-0">{poke.bst}</span>
          </div>
        </div>

        {/* Abilities */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-semibold mb-4">Abilities</h2>
          {pokeAbilities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ability data synced yet.</p>
          ) : (
            <div className="space-y-3">
              {pokeAbilities.map((pa) => (
                <div
                  key={pa.slot}
                  className={`p-3 rounded-md border ${
                    pa.ability.isNotable
                      ? 'border-yellow-500/30 bg-yellow-500/5'
                      : 'border-border bg-secondary/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{pa.ability.name}</span>
                    {pa.isHidden && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                        Hidden
                      </span>
                    )}
                    {pa.ability.isNotable && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                        Notable
                      </span>
                    )}
                  </div>
                  {pa.ability.effectShort && (
                    <p className="text-xs text-muted-foreground mt-1">{pa.ability.effectShort}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Learnset */}
      <div className="rounded-lg border border-border bg-card p-6 mt-6">
        <h2 className="font-semibold mb-4">
          Learnset <span className="text-sm font-normal text-muted-foreground">({pokeMoves.length} moves)</span>
        </h2>
        {pokeMoves.length === 0 ? (
          <p className="text-sm text-muted-foreground">No move data synced yet.</p>
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
                {pokeMoves.map((pm) => (
                  <tr key={pm.move.id} className="border-b border-border/50 last:border-0">
                    <td className="py-1.5 pr-4 font-medium">{pm.move.name}</td>
                    <td className="py-1.5 pr-4">
                      <span
                        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase text-white"
                        style={{ backgroundColor: TYPE_COLORS[pm.move.type] ?? '#888' }}
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
      </div>
    </div>
  );
}
