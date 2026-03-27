import Link from 'next/link';
import Image from 'next/image';
import { TypeBadge } from './TypeBadge';
import { TYPE_COLORS } from '../../../tailwind.config';

interface PokemonCardProps {
  pokemon: {
    slug: string;
    name: string;
    pokeapiId: number;
    typeOne: string;
    typeTwo: string | null;
    spriteDefault: string | null;
    isLegendary: boolean;
    isMythical: boolean;
  };
}

export function PokemonCard({ pokemon }: PokemonCardProps) {
  const dexNumber = pokemon.pokeapiId <= 10000
    ? `#${String(pokemon.pokeapiId).padStart(3, '0')}`
    : null;

  const typeColor = TYPE_COLORS[pokemon.typeOne] ?? '#888888';

  return (
    <Link
      href={`/pokemon/${pokemon.slug}`}
      className="group relative rounded-2xl p-4 pt-3 type-glow flex flex-col items-center overflow-hidden"
      style={{
        '--glow-color': `${typeColor}40`,
        background: `radial-gradient(ellipse at 50% 30%, ${typeColor}1A, transparent 65%), hsl(var(--card))`,
        borderTop: `2px solid ${typeColor}50`,
        borderLeft: '1px solid rgba(255,255,255,0.04)',
        borderRight: '1px solid rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      } as React.CSSProperties}
    >
      {/* Dex number — top left corner */}
      {dexNumber && (
        <span className="self-start text-sm font-label font-bold text-muted-dim group-hover:text-white/60 transition-colors mb-1">
          {dexNumber}
        </span>
      )}

      <div className="relative w-20 h-20 sm:w-24 sm:h-24 my-2">
        {pokemon.spriteDefault ? (
          <Image
            src={pokemon.spriteDefault}
            alt={pokemon.name}
            fill
            sizes="96px"
            className="object-contain pixelated z-10 relative group-hover:scale-110 transition-transform duration-500"
            unoptimized
          />
        ) : (
          <div className="w-full h-full rounded-xl bg-surface-bright flex items-center justify-center text-muted-foreground text-xs">
            ?
          </div>
        )}
        {/* Type-colored glow behind sprite — bigger and brighter */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"
          style={{ backgroundColor: typeColor }}
        />
      </div>

      <h3 className="text-sm font-headline font-extrabold text-center mt-1 group-hover:text-white transition-colors leading-tight">
        {pokemon.name}
      </h3>

      <div className="flex gap-1 mt-2 flex-wrap justify-center">
        <TypeBadge type={pokemon.typeOne} />
        {pokemon.typeTwo && <TypeBadge type={pokemon.typeTwo} />}
      </div>

      {(pokemon.isLegendary || pokemon.isMythical) && (
        <span className="text-[9px] mt-2 px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 font-label font-medium">
          {pokemon.isMythical ? 'Mythical' : 'Legendary'}
        </span>
      )}
    </Link>
  );
}
